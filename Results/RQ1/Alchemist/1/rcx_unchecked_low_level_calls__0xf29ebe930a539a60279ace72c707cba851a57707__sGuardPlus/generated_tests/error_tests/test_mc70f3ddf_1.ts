import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant test - mc70f3ddf", function () {
  it("should detect mutant that uses msg.value+1 instead of msg.value", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some initial balance to avoid underflow
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Get initial balances
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);

    // Send exactly 1 ether to the go function
    const tx = await attacker.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1"),
      data: "0x" // call go() via fallback
    });
    await tx.wait();

    // Get final balances
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    const finalContractBalance = await ethers.provider.getBalance(contractAddress);

    // In the original contract, owner should receive exactly 1 ether (the msg.value)
    // In the mutant, the contract tries to send msg.value+1 (1 ether + 1 wei)
    // which will fail because the contract only has 1 ether from the caller + initial balance
    // but the call will try to send 1 wei more than received
    const expectedOwnerIncrease = ethers.parseEther("1");
    
    // The mutant will revert because target.call with msg.value+1 will try to send more than available
    // So the owner balance should remain unchanged (or only changed by initial balance transfers)
    // We can check that the transaction did NOT result in the expected behavior
    const actualOwnerIncrease = finalOwnerBalance - initialOwnerBalance;
    const contractBalanceChange = initialContractBalance - finalContractBalance;

    // Original would succeed: owner gets 1 ether, contract balance goes down by 1
    // Mutant fails: the call with msg.value+1 reverts, so owner gets nothing
    // We detect the mutant by checking that the owner did NOT receive the expected amount
    expect(actualOwnerIncrease).to.not.equal(expectedOwnerIncrease);
    
    // Also verify contract still has the sent ether (since the call failed)
    expect(contractBalanceChange).to.be.lessThan(ethers.parseEther("0.001")); // minimal change due to gas
  });
});