import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should revert when non-owner calls withdrawAll (mutant detection)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 tries to call withdrawAll (protected by onlyOwner modifier)
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});