import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit Transfer event on successful transfer, killing mutant that removes the event emission", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens and check for Transfer event emission
    const transferAmount = 100;
    await expect(instance.transfer(addr1.address, transferAmount))
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, addr1.address, transferAmount);
  });
});