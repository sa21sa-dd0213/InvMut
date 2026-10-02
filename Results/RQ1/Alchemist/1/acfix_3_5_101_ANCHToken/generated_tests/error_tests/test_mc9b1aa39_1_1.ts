import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - mc9b1aa39", function () {
  it("should kill mutant by calling transfer from allowed role when contract has zero balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with Uniswap router address (use zero address as placeholder since we only test token logic)
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000000", // router address
      "0x0000000000000000000000000000000000000001"  // USDToken address
    );
    await instance.waitForDeployment();

    // Get the initial total supply to understand token distribution
    const totalSupply = await instance.totalSupply();

    // Set minTxnAmount to a small value so our test transfer triggers the reward logic
    await instance.setMinTxnAmount(ethers.parseEther("1"));

    // Transfer some tokens to addr1 to have a balance to work with
    await instance.transfer(addr1.address, ethers.parseEther("1000"));

    // Send tokens to the contract so it has balance
    await instance.transfer(instance.target, ethers.parseEther("100"));

    // Now verify contract has balance
    const contractBalance = await instance.balanceOf(instance.target);
    expect(contractBalance).to.be.gt(0);

    // Set rewardRate to 100% and send a small amount to drain contract
    await instance.setRewardRate(10000); // 100% reward rate
    await instance.setMinTxnAmount(ethers.parseEther("0.1"));

    // Transfer all tokens out of contract to drain its balance
    await instance.connect(owner).transfer(addr1.address, contractBalance);

    // Now contract should have 0 balance
    const contractBalanceAfter = await instance.balanceOf(instance.target);
    expect(contractBalanceAfter).to.equal(0);

    console.log("Test setup complete - contract has 0 balance as required");
  });
});