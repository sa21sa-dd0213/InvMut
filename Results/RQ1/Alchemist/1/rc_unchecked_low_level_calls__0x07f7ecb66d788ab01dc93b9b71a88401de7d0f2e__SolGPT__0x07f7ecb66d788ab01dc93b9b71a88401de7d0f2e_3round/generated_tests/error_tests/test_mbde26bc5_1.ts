import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mbde26bc5", function () {
  it("should detect when whale address is set to zero instead of provided address", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await (await instance.OpenToThePublic()).wait();
    
    // Player makes a wager to become eligible to play
    await (await instance.connect(player).wager({ value: betLimit })).wait();
    
    // Player plays and loses (since difficulty is 0, winningNumber will never equal difficulty/2)
    await (await instance.connect(player).play()).wait();
    
    // Check that the whale actually received the lost wager amount
    const whaleBalance = await ethers.provider.getBalance(whale.address);
    const expectedAmount = betLimit / 2n; // loseWager sends betLimit/2 to whale
    
    // In the original contract, whale would receive the funds
    // In the mutant, funds go to address(0) and whale gets nothing
    expect(whaleBalance).to.equal(ethers.parseEther("10000") + expectedAmount); // whale starts with 10000 ETH from hardhat
  });
});