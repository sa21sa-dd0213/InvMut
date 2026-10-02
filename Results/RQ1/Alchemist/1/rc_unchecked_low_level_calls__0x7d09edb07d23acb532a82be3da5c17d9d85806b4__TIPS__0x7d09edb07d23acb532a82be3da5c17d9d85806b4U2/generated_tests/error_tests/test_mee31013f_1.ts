import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - mee31013f", function () {
  it("should detect mutant that changes > to < in hasPlayerWagered", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with required constructor arguments
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, betLimit);
    await instance.waitForDeployment();
    
    // Open contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player makes a valid wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Verify hasPlayerWagered returns true for the player who wagered
    const hasWagered = await instance.hasPlayerWagered(player.address);
    expect(hasWagered).to.equal(true);
  });
});