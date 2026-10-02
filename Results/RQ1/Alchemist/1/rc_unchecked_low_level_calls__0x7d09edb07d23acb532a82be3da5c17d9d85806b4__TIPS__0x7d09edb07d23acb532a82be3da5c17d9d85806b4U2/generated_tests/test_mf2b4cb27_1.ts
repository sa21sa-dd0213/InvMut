import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame - kill mutant mf2b4cb27", function () {
  it("should return correct half of balance from winnersPot()", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Owner opens the game to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player makes a wager of exactly betLimit
    await instance.connect(player).wager({ value: betLimit });
    
    // Get the contract balance after the wager
    const contractBalance = await ethers.provider.getBalance(instance.target);
    const expectedHalf = contractBalance / 2n;
    
    // Call winnersPot() and assert it returns exactly half the balance
    const winnersPotValue = await instance.winnersPot();
    expect(winnersPotValue).to.equal(expectedHalf);
  });
});