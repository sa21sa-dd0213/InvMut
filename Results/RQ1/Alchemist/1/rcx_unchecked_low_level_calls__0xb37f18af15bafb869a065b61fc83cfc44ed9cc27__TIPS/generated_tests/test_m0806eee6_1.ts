import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls withdraw (kill mutant m0806eee6)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send ETH to contract via fallback to have balance to withdraw
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Non-owner attempts to withdraw - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});