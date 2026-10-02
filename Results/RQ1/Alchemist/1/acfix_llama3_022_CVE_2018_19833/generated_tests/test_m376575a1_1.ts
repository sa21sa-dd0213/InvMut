import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m376575a1 test", function () {
  it("should detect mutant that replaces ** with * in totalSupply calculation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initialSupply = 1000 and decimals = 0 (default)
    const initialSupply = 1000;
    const instance = await Factory.deploy(
      initialSupply,
      "TestToken",
      "TT"
    );
    await instance.waitForDeployment();

    // In the original: totalSupply = initialSupply * 10**0 = initialSupply * 1 = 1000
    // In the mutant:   totalSupply = initialSupply * 10 * 0 = 0
    // So totalSupply should be 1000 in original, but will be 0 in mutant
    const totalSupply = await instance.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("1000")); // ethers.parseEther works as 1000 * 10^18
    
    // Also verify owner balance matches totalSupply
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(totalSupply);
  });
});