import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m085f1731 by testing zero-value transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer zero value - should succeed in original but fail in mutant
    const tx = instance.connect(owner).transfer(addr1.address, 0);
    await expect(tx).to.not.be.reverted;
  });
});