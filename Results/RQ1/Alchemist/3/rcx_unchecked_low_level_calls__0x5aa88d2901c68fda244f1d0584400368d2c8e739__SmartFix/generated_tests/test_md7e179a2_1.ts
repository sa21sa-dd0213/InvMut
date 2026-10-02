import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test - md7e179a2", function () {
  it("should detect the mutant by sending exact contract balance and verifying transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some ether
    const initialBalance = ethers.parseEther("2.0");
    await owner.sendTransaction({
      to: instanceAddress,
      value: initialBalance
    });

    // Get contract balance before calling multiplicate
    const contractBalanceBefore = await ethers.provider.getBalance(instanceAddress);
    
    // Send exactly the contract balance to multiplicate
    const sendAmount = contractBalanceBefore;
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value equal to contract balance
    const tx = await instance.connect(owner).multiplicate(addr2.address, { value: sendAmount });
    await tx.wait();

    // Check that the transfer happened (original behavior)
    // The expected transfer amount should be contractBalanceBefore + sendAmount = 2 * contractBalanceBefore
    const expectedTransfer = contractBalanceBefore + sendAmount;
    const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);
    const actualTransfer = addr2BalanceAfter - addr2BalanceBefore;

    // In the original contract, the transfer should happen
    // In the mutant (with > instead of >=), the transfer will NOT happen when msg.value == contract balance
    // So we expect the transfer to NOT have occurred for the mutant
    expect(actualTransfer).to.equal(ethers.parseEther("0"));
    
    // Verify contract is now empty (since mutant didn't transfer)
    const contractBalanceAfter = await ethers.provider.getBalance(instanceAddress);
    expect(contractBalanceAfter).to.equal(sendAmount);
  });
});