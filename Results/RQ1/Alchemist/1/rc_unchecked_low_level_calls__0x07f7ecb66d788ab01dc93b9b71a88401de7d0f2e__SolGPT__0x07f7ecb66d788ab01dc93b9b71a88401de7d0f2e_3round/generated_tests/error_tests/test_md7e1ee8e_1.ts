import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - hasPlayerWagered", function () {
  it("should detect mutant md7e1ee8e by verifying hasPlayerWagered returns true for a player who has wagered", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with required constructor arguments
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Verify hasPlayerWagered returns true for the player who wagered
    const result = await instance.connect(player).hasPlayerWagered(player.address);
    
    // The original returns true, the mutant would return false (uint256 < 0 is always false)
    expect(result).to.equal(true);
  });
});