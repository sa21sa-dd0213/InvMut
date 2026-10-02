import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m9088af75", function () {
  it("should revert when non-owner calls onlyOwner function after mutant removes access control", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdraw has balance to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Non-owner (addr1) attempts to withdraw - should revert in original, but mutant removes check
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});