import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m5771dd21 test", function () {
  it("should revert when calling transfer with sha256 hash instead of keccak256", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20-like contract that has transferFrom function
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();

    // Deploy the airPort contract (no constructor arguments needed)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();

    // Setup: Mint some tokens to owner and approve airPort contract
    const mintAmount = ethers.parseEther("100");
    await mockToken.mint(owner.address, mintAmount);
    await mockToken.approve(airPort.target, mintAmount);

    // Test case: Call transfer with valid parameters
    // On the original contract this would succeed, on the mutant it should revert
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // The mutant uses sha256 which produces a different function selector
    // This will cause the external call to fail, triggering the require(_s) revert
    await expect(
      airPort.connect(owner).transfer(
        owner.address,
        mockToken.target,
        recipients,
        transferAmount
      )
    ).to.be.reverted;
  });
});