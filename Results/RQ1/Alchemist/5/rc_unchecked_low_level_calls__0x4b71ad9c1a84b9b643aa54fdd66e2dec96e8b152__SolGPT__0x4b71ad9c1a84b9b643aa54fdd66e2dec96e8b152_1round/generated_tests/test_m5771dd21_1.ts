import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - sha256 vs keccak256", function () {
  it("should detect mutant m5771dd21 by verifying transfer reverts when using sha256 selector", async function () {
    // Deploy airPort (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const airPort = await Factory.deploy();
    await airPort.waitForDeployment();

    // Get signers
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20-like contract that implements transferFrom
    const MockToken = await ethers.getContractFactory("contracts/MockToken.sol:MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();

    // Mint tokens to 'from' and approve airPort to spend them
    const amount = ethers.parseEther("100");
    await mockToken.mint(from.address, amount);
    await mockToken.connect(from).approve(airPort.target, amount);

    // The original contract uses keccak256("transferFrom(address,address,uint256)")
    // The mutant uses sha256 instead, producing a different function selector
    // This will cause the call to fail because the selector won't match transferFrom
    // Therefore, the transaction should revert
    
    await expect(
      airPort.transfer(from.address, mockToken.target, [to.address], amount)
    ).to.be.reverted;
  });
});