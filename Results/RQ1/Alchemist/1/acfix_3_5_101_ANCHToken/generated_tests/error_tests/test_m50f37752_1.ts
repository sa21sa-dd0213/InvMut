import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m50f37752 - approve to zero address", function () {
  it("should revert when trying to approve the zero address as spender", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ANCHToken with constructor arguments
    // The constructor requires: address _route, address _USDToken
    // We need a UniswapV2Router02 address and a USD token address
    // For testing purposes, we can use the owner address as placeholder
    // since the test doesn't require actual Uniswap interaction
    const Factory = await ethers.getContractFactory("ANCHToken");
    
    // Deploy with dummy addresses for the constructor
    // These addresses won't be used in this test case
    const dummyRouter = "0x0000000000000000000000000000000000000001";
    const dummyUSDToken = "0x0000000000000000000000000000000000000002";
    
    const instance = await Factory.deploy(dummyRouter, dummyUSDToken);
    await instance.waitForDeployment();

    // Attempt to approve the zero address as spender
    // The original contract should revert this transaction
    // The mutant (which removes the zero-address check) would allow it
    await expect(
      instance.connect(owner).approve(ethers.ZeroAddress, ethers.parseEther("100"))
    ).to.be.revertedWith("ERC20: approve to the zero address");
  });
});