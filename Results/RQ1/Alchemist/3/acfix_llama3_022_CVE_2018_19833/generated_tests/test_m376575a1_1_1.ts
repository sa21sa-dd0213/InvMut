import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m376575a1 detection", function () {
  it("should detect mutant by verifying totalSupply equals initialSupply when decimals is 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initialSupply = 1000 (decimals is hardcoded to 0)
    const initialSupply = 1000;
    const instance = await Factory.deploy(
      initialSupply,
      "TestToken",
      "TTK"
    );
    await instance.waitForDeployment();

    // For the original contract: totalSupply = initialSupply * 10**0 = initialSupply * 1 = initialSupply
    // For the mutant: totalSupply = initialSupply * 10 * 0 = 0
    // So asserting totalSupply equals initialSupply will fail on the mutant
    const totalSupply = await instance.totalSupply();
    expect(totalSupply).to.equal(initialSupply);
  });
});