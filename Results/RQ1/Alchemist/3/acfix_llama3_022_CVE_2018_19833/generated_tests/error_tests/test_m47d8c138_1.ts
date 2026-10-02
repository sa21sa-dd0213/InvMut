import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m47d8c138: burn function missing Burn event emission", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with 1000 initial supply, name "Test", symbol "TST"
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "Test", "TST");
    await instance.waitForDeployment();

    // Burn 500 tokens from owner's balance
    const burnAmount = 500;
    const tx = await instance.connect(owner).burn(burnAmount);
    const receipt = await tx.wait();

    // Check that the Burn event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Burn")
      .withArgs(owner.address, burnAmount);
  });
});