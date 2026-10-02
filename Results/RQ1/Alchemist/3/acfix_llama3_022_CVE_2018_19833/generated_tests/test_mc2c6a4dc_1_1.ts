import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant mc2c6a4dc test", function () {
  it("should emit FrozenFunds event when freezeAccount is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Call freezeAccount and verify the event is emitted
    await expect(instance.freezeAccount(addr1.address, true))
      .to.emit(instance, "FrozenFunds")
      .withArgs(addr1.address, true);
  });
});