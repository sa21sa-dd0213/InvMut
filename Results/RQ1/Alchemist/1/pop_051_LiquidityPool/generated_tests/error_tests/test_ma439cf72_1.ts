import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - kill ma439cf72", function () {
  it("should emit File event when calling file function with valid parameters", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with mock addresses for constructor parameters
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const assetAddress = "0x0000000000000000000000000000000000000001";
    const shareAddress = "0x0000000000000000000000000000000000000002";
    const investmentManagerAddress = "0x0000000000000000000000000000000000000003";
    
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(
      poolId,
      trancheId,
      assetAddress,
      shareAddress,
      investmentManagerAddress
    );
    await instance.waitForDeployment();

    // Call file function with valid parameters
    const newManagerAddress = "0x0000000000000000000000000000000000000004";
    const tx = await instance.file("investmentManager", newManagerAddress);
    const receipt = await tx.wait();

    // Verify File event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "File")
      .withArgs("investmentManager", newManagerAddress);
  });
});