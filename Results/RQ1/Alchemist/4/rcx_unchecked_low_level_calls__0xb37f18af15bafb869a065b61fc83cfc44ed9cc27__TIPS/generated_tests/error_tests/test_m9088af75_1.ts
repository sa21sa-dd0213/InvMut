import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m9088af75 by calling onlyOwner function from non-owner and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call withdrawAll from a non-owner address - should revert in original
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});