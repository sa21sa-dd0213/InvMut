import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - balanceOf", function () {
  it("should return correct balance after minting tokens to an address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract with required constructor arguments
    // Note: The constructor requires _route (UniswapV2Router address) and _USDToken address
    // For testing purposes, we'll use placeholder addresses since we're testing balanceOf
    const ROUTER_ADDRESS = "0x0000000000000000000000000000000000000001";
    const USD_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000002";

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(ROUTER_ADDRESS, USD_TOKEN_ADDRESS);
    await instance.waitForDeployment();

    // Get the initial total supply
    const totalSupply = await instance.totalSupply();

    // Check the balance of the owner (who received the minted tokens in constructor)
    const ownerBalance = await instance.balanceOf(owner.address);

    // The owner should have received the total supply (10,000,000 tokens with 18 decimals)
    const expectedBalance = ethers.parseEther("10000000");

    // This assertion should fail on the mutant since balanceOf returns 0
    expect(ownerBalance).to.equal(expectedBalance);

    // Additional check: verify addr1 has 0 balance initially
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(0);
  });
});