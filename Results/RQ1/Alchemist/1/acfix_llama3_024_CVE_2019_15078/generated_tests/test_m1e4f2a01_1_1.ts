import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - m1e4f2a01", function () {
  it("should detect mutant that replaces totalDistributed >= totalSupply with false", async function () {
    const [owner, investor1, investor2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial state
    const totalSupply = ethers.parseEther("500000000");
    const initialDistributed = ethers.parseEther("200000000");
    expect(await instance.totalSupply()).to.equal(totalSupply);
    expect(await instance.totalDistributed()).to.equal(initialDistributed);
    expect(await instance.distributionFinished()).to.equal(false);

    // Calculate how much more needs to be distributed to reach total supply
    const remainingToDistribute = totalSupply - initialDistributed;

    // We need to distribute enough tokens to trigger the finish condition
    // The getTokens() function distributes 'value' tokens each time
    // value starts at 1000e18 and decreases by factor of 99999/100000 each call
    // We'll call getTokens() multiple times until totalDistributed >= totalSupply

    // First, let investor1 call getTokens() to start the distribution
    // We need to send ether to trigger getTokens() via receive()
    await investor1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Check if distribution finished after first call
    let distributionFinished = await instance.distributionFinished();

    // If not finished, continue calling getTokens() with other investors
    // until we've distributed enough tokens
    let totalDistributed = await instance.totalDistributed();
    let iterations = 0;
    const maxIterations = 1000; // Safety limit

    while (totalDistributed < totalSupply && iterations < maxIterations) {
      // Use a new investor each time (blacklist prevents reuse)
      const newInvestor = ethers.Wallet.createRandom().connect(ethers.provider);
      // Fund the new investor with some ETH
      await owner.sendTransaction({
        to: newInvestor.address,
        value: ethers.parseEther("1")
      });

      // Have new investor call getTokens()
      await newInvestor.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      });

      totalDistributed = await instance.totalDistributed();
      iterations++;
    }

    // After distributing enough tokens, distributionFinished should be true
    // In the original contract, this would be set to true
    // In the mutant with 'if (false)', it will never be set to true
    distributionFinished = await instance.distributionFinished();

    // The test should fail on the mutant because distributionFinished remains false
    expect(distributionFinished).to.equal(true);

    // Additional verification: totalDistributed should be >= totalSupply
    expect(await instance.totalDistributed()).to.be.at.least(totalSupply);
  });
});