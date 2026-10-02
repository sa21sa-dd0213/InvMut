import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - me1a23bfb", function () {
  it("should revert when non-owner tries to burn tokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(
      initialSupply,
      "TestToken",
      "TST"
    );
    await instance.waitForDeployment();

    // Attempt to burn tokens from a non-owner account
    await expect(
      instance.connect(addr1).burn(100)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});