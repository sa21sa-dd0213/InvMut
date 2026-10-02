import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test for freezeAccount event emission", function () {
  it("should emit FrozenFunds event when freezeAccount is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Call freezeAccount to freeze addr1
    const tx = await instance.connect(owner).freezeAccount(addr1.address, true);
    const receipt = await tx.wait();

    // Verify that FrozenFunds event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "FrozenFunds")
      .withArgs(addr1.address, true);
  });
});