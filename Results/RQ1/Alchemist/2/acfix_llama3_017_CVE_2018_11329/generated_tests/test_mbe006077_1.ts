import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant mbe006077 test", function () {
  it("should detect removal of require(marketDrugs==0) in seedMarket", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to seedMarket should succeed (marketDrugs is 0)
    const initialDrugs = ethers.parseEther("100");
    await instance.connect(owner).seedMarket(initialDrugs);
    
    // Verify market was initialized
    expect(await instance.initialized()).to.equal(true);
    expect(await instance.marketDrugs()).to.equal(initialDrugs);

    // Second call to seedMarket should revert in original, but succeed in mutant
    const secondDrugs = ethers.parseEther("200");
    
    // In the original contract, this would revert due to require(marketDrugs==0)
    // In the mutant, this will succeed and overwrite marketDrugs
    // We detect the mutant by checking that marketDrugs changed after second call
    await instance.connect(owner).seedMarket(secondDrugs);
    
    // If mutant is present, marketDrugs will be updated to secondDrugs
    // In original, this line would never be reached because the call would revert
    expect(await instance.marketDrugs()).to.equal(secondDrugs);
  });
});