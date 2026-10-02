import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m0c00858a", function () {
  it("should revert when calling multiplicate with non-zero msg.value and non-zero contract balance (mutant uses == instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await fundTx.wait();

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("10"));

    // Call multiplicate with non-zero msg.value from owner
    // This should work on original (>= always true) but revert on mutant (== only true when msg.value is 0)
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1")
    });

    // The mutant will revert because (balance + 1) != balance
    await expect(tx).to.be.reverted;
  });
});