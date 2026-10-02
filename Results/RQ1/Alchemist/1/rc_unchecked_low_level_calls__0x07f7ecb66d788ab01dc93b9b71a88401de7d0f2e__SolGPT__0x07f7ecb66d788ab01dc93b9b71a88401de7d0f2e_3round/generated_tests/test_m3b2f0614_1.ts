import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m3b2f0614 - winnersPot return value", function () {
  it("should return half the contract balance after a wager, not zero", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const wagerLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await (await instance.OpenToThePublic()).wait();
    
    // Player makes a wager (sends exact betLimit)
    await (await instance.connect(player).wager({ value: wagerLimit })).wait();
    
    // Get contract balance after wager
    const balanceAfterWager = await ethers.provider.getBalance(await instance.getAddress());
    const expectedHalf = balanceAfterWager / 2n;
    
    // Call winnersPot - should return half the balance
    const potValue = await instance.winnersPot();
    
    // Original returns half; mutant returns 0
    expect(potValue).to.equal(expectedHalf);
    expect(potValue).to.not.equal(0n);
  });
});