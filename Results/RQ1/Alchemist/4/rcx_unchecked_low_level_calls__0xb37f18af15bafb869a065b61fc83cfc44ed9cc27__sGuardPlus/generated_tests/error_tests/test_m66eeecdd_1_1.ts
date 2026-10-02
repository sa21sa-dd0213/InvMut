import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m66eeecdd test", function () {
  it("should prevent non-owner from calling withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner tries to call withdrawAll - should revert in original but succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith("");

    // Verify that the balance remains unchanged (mutant would drain it)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1.0"));
  });
});