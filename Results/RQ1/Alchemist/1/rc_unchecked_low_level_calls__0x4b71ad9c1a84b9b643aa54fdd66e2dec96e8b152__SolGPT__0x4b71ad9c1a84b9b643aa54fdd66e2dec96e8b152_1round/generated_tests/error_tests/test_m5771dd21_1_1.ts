import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - keccak256 replaced with sha256", function () {
  it("should revert when calling transfer with a valid ERC20 token that implements transferFrom", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();

    // Deploy a minimal ERC20 token that implements transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("contracts/test/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy the airPort contract (no constructor arguments needed)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();

    // Mint tokens to 'from' address and approve airPort to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await airPort.getAddress(), mintAmount);

    const recipients = [to1.address, to2.address];
    const transferAmount = ethers.parseEther("10");

    // This should succeed on original (correct keccak256 selector) but fail on mutant (wrong sha256 selector)
    await expect(
      airPort.connect(from).transfer(from.address, await token.getAddress(), recipients, transferAmount)
    ).to.be.reverted;
  });
});