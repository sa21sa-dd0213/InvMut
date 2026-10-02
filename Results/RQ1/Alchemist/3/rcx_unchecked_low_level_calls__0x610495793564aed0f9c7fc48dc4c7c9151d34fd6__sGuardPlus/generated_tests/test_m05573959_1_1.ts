import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner calls onlyOwner function (mutant kills owner access)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // Owner calling withdrawAll should succeed in original, but mutant rejects owner
    // So we expect a revert when owner calls the function
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});