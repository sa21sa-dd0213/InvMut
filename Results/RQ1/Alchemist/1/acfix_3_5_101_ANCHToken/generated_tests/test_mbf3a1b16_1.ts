import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - changeUniswapV2Pair", function () {
  it("should set uniswapV2Pair to the provided address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock router to get factory address
    const RouterFactory = await ethers.getContractFactory("IUniswapV2Router02");
    // We need to deploy with actual Uniswap V2 router address
    // Using a known mainnet address for testing
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USD_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(UNISWAP_V2_ROUTER, USD_TOKEN);
    await instance.waitForDeployment();

    // Get current uniswapV2Pair
    const initialPair = await instance.uniswapV2Pair();
    
    // Set a new pair address
    const newPairAddress = "0x0000000000000000000000000000000000000001";
    await instance.changeUniswapV2Pair(newPairAddress);
    
    // Verify the pair was set to the new address, not address(0)
    const updatedPair = await instance.uniswapV2Pair();
    expect(updatedPair).to.equal(newPairAddress);
    expect(updatedPair).to.not.equal(ethers.ZeroAddress);
  });
});