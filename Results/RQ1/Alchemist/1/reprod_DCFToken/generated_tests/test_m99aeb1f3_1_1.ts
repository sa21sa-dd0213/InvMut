import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant detection - constructor arithmetic", function () {
  it("should detect mutant m99aeb1f3 by verifying total supply equals expected value", async function () {
    const [owner, liquidityReceiver] = await ethers.getSigners();
    
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(liquidityReceiver.address);
    await instance.waitForDeployment();

    const expectedSupply = ethers.parseEther("2000000"); // 2,000,000 * 10^18
    const actualSupply = await instance.totalSupply();
    
    // The mutant uses ** instead of *, producing an astronomically large number
    // The original calculates 2000000 * 10^18 = 2 * 10^24
    expect(actualSupply).to.equal(expectedSupply);
  });
});