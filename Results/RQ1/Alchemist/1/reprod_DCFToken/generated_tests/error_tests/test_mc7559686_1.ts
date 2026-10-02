import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mc7559686 test", function () {
  it("should detect mutant that changes initial supply from multiplication to addition", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Get the total supply after deployment
    const totalSupply = await instance.totalSupply();
    
    // Expected supply: 2000000 * 10^18 = 2000000000000000000000000
    const expectedSupply = ethers.parseEther("2000000");
    
    // The original contract should have exactly 2,000,000 * 10^18 tokens
    // The mutant would have 2000000 + 10^18 = 1000000000000002000000 tokens
    // This assertion will fail on the mutant, killing it
    expect(totalSupply).to.equal(expectedSupply);
  });
});