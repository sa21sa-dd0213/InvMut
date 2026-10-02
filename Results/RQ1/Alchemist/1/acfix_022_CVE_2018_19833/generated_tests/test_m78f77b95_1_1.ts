import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - m78f77b95", function () {
  it("should detect mutant by verifying totalSupply equals initialSupply when decimals=0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with a positive initialSupply (e.g., 1000 tokens)
    const initialSupply = ethers.parseEther("1000");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Get the totalSupply after deployment
    const totalSupply = await instance.totalSupply();
    
    // In the original contract: totalSupply = initialSupply * 10**0 = initialSupply
    // In the mutant: totalSupply = initialSupply * 10 * 0 = 0
    // So checking totalSupply equals initialSupply will pass on original but fail on mutant
    expect(totalSupply).to.equal(initialSupply);
    
    // Additionally verify that the deployer's balance matches
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(initialSupply);
  });
});