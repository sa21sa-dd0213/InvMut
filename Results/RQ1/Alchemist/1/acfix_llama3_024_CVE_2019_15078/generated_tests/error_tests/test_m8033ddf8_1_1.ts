import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - onlyWhitelist removal in getTokens", function () {
  it("should revert when blacklisted address tries to call getTokens() again, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure distribution is not finished and there are tokens available
    expect(await instance.distributionFinished()).to.equal(false);
    
    // Get initial value
    const initialValue = await instance.value();
    expect(initialValue).to.be.gt(0);
    
    // First call: addr1 calls getTokens() - this should succeed and blacklist addr1
    const tx1 = await instance.connect(addr1).getTokens({ value: 0 });
    await tx1.wait();

    // Verify addr1 is now blacklisted
    expect(await instance.blacklist(addr1.address)).to.equal(true);

    // Second call: addr1 tries to call getTokens() again
    // In the original contract, this should revert due to onlyWhitelist modifier
    // In the mutant (without onlyWhitelist), this will succeed
    await expect(
      instance.connect(addr1).getTokens({ value: 0 })
    ).to.be.reverted;
  });
});