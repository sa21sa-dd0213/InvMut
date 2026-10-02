import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mfeccd3fe test", function () {
  it("should detect the mutant that removes > 0 comparison in hasPlayerWagered", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Set difficulty to avoid division by zero
    await (await instance.connect(owner).AdjustDifficulty(10)).wait();
    
    // Player makes a wager
    await (await instance.connect(addr1).wager({ value: wagerLimit })).wait();
    
    // Call hasPlayerWagered for the player who wagered
    const result = await instance.connect(owner).hasPlayerWagered(addr1.address);
    
    // The mutant returns wagers[player] (uint256) instead of wagers[player] > 0 (bool)
    // For a wager of 1 ether, the mutant would return 1000000000000000000 which is truthy
    // But we need to test the exact boolean value
    expect(result).to.equal(true);
    
    // Now test with a player who has NOT wagered (wager amount = 0)
    const [, addr2] = await ethers.getSigners();
    const resultNoWager = await instance.connect(owner).hasPlayerWagered(addr2.address);
    
    // The mutant returns wagers[addr2] which is 0 (falsy)
    // The original returns wagers[addr2] > 0 which is false
    expect(resultNoWager).to.equal(false);
    
    // Edge case: test with maximum uint256 value to expose potential differences
    // We can't directly set wagers to max uint256, but we can verify the function
    // returns the correct boolean type consistently
    const resultType = typeof result;
    expect(resultType).to.equal("boolean");
  });
});