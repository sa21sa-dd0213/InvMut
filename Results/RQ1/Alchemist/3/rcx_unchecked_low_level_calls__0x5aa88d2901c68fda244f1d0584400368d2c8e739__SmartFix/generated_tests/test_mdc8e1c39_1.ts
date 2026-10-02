import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant mdc8e1c39 test", function () {
  it("should detect mutant that shifts threshold by 1 wei in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ether
    const fundAmount = ethers.parseEther("2");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(fundAmount);

    // Send exactly 1 wei less than the contract balance
    const sendAmount = initialBalance - BigInt(1);
    
    // Get addr1's balance before
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with sendAmount
    await instance.connect(owner).multiplicate(addr1.address, { value: sendAmount });

    // Get addr1's balance after
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // In the original contract, condition should be false (sendAmount < balance)
    // so no transfer should happen - addr1 balance should remain unchanged
    // In the mutant, condition becomes true (sendAmount + 1 >= balance)
    // so a transfer would occur, increasing addr1's balance
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore);
  });
});