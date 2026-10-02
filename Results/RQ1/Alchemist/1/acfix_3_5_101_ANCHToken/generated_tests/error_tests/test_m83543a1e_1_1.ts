import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - m83543a1e", function () {
  it("should return correct token name and detect mutant that removes return statement", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with constructor arguments - need a router address and USD token address
    // Using a mock router for testing purposes
    const RouterFactory = await ethers.getContractFactory("MockUniswapV2Router02");
    const router = await RouterFactory.deploy();
    await router.waitForDeployment();

    const USDTokenFactory = await ethers.getContractFactory("MockERC20");
    const usdToken = await USDTokenFactory.deploy("USD Token", "USD", 18);
    await usdToken.waitForDeployment();

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(await router.getAddress(), await usdToken.getAddress());
    await instance.waitForDeployment();

    // Call the name() function and assert it returns "ANCH"
    const tokenName = await instance.name();
    expect(tokenName).to.equal("ANCH");
  });
});