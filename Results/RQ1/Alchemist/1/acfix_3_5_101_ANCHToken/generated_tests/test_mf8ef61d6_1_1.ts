import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test for changeUniswapV2Pair", function () {
  it("should set uniswapV2Pair to the provided address, not the contract address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock token to use as the USD token parameter
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();

    // Deploy the Uniswap V2 Router mock (or use a known test router address)
    // For this test we'll use a simple mock that returns a factory address
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();

    // Deploy ANCHToken with constructor arguments
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const instance = await ANCHToken.deploy(
      await mockRouter.getAddress(),
      await mockToken.getAddress()
    );
    await instance.waitForDeployment();

    // Get the current uniswapV2Pair before changing it
    const initialPair = await instance.uniswapV2Pair();

    // Call changeUniswapV2Pair with a new address (addr1's address)
    const newPairAddress = await addr1.getAddress();
    await instance.changeUniswapV2Pair(newPairAddress);

    // Assert that uniswapV2Pair equals the provided address, not the contract's own address
    const contractAddress = await instance.getAddress();
    const updatedPair = await instance.uniswapV2Pair();

    expect(updatedPair).to.equal(newPairAddress);
    expect(updatedPair).to.not.equal(contractAddress);
  });
});