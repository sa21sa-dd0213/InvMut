import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - mafd2c245", function () {
  it("should revert when owner calls onlyOwner function due to inverted modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // Therefore, when the owner calls an onlyOwner function, it should revert
    // We test this by calling withdrawAll() from the owner address
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});