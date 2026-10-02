import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should detect mutant by sending exactly contract balance and checking recipient balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with initial balance
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: contractAddress,
      value: initialFunding
    });

    // Get contract balance before
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    expect(contractBalanceBefore).to.equal(initialFunding);

    // Get recipient balance before
    const recipientBalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Send exactly contract balance to multiplicate function
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: contractBalanceBefore
    });
    await tx.wait();

    // Check recipient balance after - should have increased by 2x contract balance (original)
    // but will remain unchanged in mutant since condition is false
    const recipientBalanceAfter = await ethers.provider.getBalance(addr2.address);
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);

    // In original: recipient gets contractBalanceBefore + msg.value (which equals contractBalanceBefore) = 2x
    // In mutant: recipient gets nothing, contract keeps both balances
    expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + contractBalanceBefore * 2n);
    expect(contractBalanceAfter).to.equal(0n);
  });
});