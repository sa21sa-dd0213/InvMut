import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - keccak256 replaced with sha256", function () {
  it("should detect the mutant by calling transfer with a valid ERC20 token and expecting success", async function () {
    // Deploy the airDrop contract (no constructor arguments needed)
    const [owner, from, to] = await ethers.getSigners();
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to the 'from' address and approve the airDrop contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await airDrop.getAddress(), mintAmount);

    // Prepare parameters for transfer
    const tos = [to.address];
    const value = ethers.parseEther("1");
    const decimals = 18;

    // On the original contract, this call succeeds because keccak256 produces the correct selector
    // On the mutant (sha256), the selector is wrong and the call will revert
    await expect(
      airDrop.transfer(from.address, await token.getAddress(), tos, value, decimals)
    ).to.not.be.reverted;
  });
});