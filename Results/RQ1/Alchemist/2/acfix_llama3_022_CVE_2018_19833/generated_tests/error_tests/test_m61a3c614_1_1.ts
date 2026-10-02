import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit Transfer event when _transfer is called, killing mutant m61a3c614", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    const transferAmount = 100;
    const tx = await instance.transfer(addr1.address, transferAmount);
    const receipt = await tx.wait();

    // Check that the Transfer event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, addr1.address, transferAmount);
  });
});