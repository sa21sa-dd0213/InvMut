import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should have totalSupply equal to initialSupply when decimals is 0 (detect mutant that replaces ** with *)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    const totalSupply = await instance.totalSupply();
    // When decimals is 0, original: 10**0 = 1, so totalSupply = initialSupply * 1 = initialSupply
    // Mutant: initialSupply * 10 * 0 = 0
    expect(totalSupply).to.equal(BigInt(initialSupply));
  });
});