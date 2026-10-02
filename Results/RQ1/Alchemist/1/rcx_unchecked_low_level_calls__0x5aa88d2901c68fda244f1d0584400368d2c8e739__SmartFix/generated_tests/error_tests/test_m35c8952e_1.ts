import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - m35c8952e", function () {
  it("should detect the mutant that adds +1 to the transfer amount in multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some initial balance (e.g., 2 ether)
    const initialBalance = ethers.parseEther("2");
    await owner.sendTransaction({
      to: contractAddress,
      value: initialBalance
    });

    // Record balances before the attack
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    const recipientBalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Send exactly the contract balance as msg.value to trigger the if condition
    const msgValue = contractBalanceBefore;
    
    // This should succeed on original (transfers contract balance + msg.value = 2 * contract balance)
    // But mutant will try to transfer 1 wei more than available -> should revert
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: msgValue })
    ).to.be.reverted;

    // Verify the recipient's balance did NOT change (mutant reverted)
    const recipientBalanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);
  });
});