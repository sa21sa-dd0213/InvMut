import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit FrozenFunds event when freezeAccount is called - kills mutant that removes event emission", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Call freezeAccount to freeze addr1
    const tx = await instance.connect(owner).freezeAccount(addr1.address, true);
    const receipt = await tx.wait();

    // Assert that the FrozenFunds event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "FrozenFunds")
      .withArgs(addr1.address, true);
  });
});