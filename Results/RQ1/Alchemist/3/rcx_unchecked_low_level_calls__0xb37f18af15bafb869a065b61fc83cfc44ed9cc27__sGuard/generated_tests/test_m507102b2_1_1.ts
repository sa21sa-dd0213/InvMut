import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m507102b2", function () {
  it("should revert when non-owner calls withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawAll has something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner should not be able to call withdrawAll (mutant removes onlyOwner modifier)
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});