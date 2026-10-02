import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should have totalSupply equal to initialSupply when decimals is 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    const totalSupply = await instance.totalSupply();
    // With decimals = 0, totalSupply should be initialSupply * 10^0 = initialSupply
    // The mutant calculates totalSupply = initialSupply * 10 * 0 = 0
    expect(totalSupply).to.equal(initialSupply);
  });
});