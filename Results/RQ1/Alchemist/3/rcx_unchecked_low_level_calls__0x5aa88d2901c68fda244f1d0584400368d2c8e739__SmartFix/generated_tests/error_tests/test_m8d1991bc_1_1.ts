import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m8d1991bc", function () {
  it("should transfer contract balance plus msg.value when msg.value >= contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialRecipientBalance = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value equal to contract balance (1 ETH)
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Assert that the recipient received contract balance + msg.value = 2 ETH
    const finalRecipientBalance = await ethers.provider.getBalance(addr2.address);
    const expectedTransfer = ethers.parseEther("2.0");
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + expectedTransfer);
  });
});