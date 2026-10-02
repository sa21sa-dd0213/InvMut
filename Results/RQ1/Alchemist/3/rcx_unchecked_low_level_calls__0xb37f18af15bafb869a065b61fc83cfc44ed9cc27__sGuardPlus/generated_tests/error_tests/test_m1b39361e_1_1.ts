import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test", function () {
  it("should revert when non-owner calls withdraw without the onlyOwner modifier check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdraw has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // addr1 (non-owner) should not be able to call withdraw
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});