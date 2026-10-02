import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - freezeAccount event emission", function () {
  it("should emit FrozenFunds event when freezeAccount is called", async function () {
    const [owner, target] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const name = "TestToken";
    const symbol = "TT";
    const instance = await Factory.deploy(initialSupply, name, symbol);
    await instance.waitForDeployment();

    // Freeze the target account and check for the FrozenFunds event
    await expect(instance.connect(owner).freezeAccount(target.address, true))
      .to.emit(instance, "FrozenFunds")
      .withArgs(target.address, true);
  });
});