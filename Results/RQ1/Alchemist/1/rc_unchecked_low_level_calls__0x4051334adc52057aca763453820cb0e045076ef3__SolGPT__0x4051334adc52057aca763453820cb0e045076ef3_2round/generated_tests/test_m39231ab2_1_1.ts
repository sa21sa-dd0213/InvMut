import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling transfer with empty _tos array on original, but pass on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock token contract that will accept any transferFrom call
    const MockTokenFactory = await ethers.getContractFactory(
      "contracts/mocks/MockERC20.sol:MockERC20"
    );
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();

    // Fund addr1 with tokens so transferFrom will succeed
    await mockToken.mint(addr1.address, ethers.parseEther("100"));
    await mockToken.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Attempt to call transfer with empty _tos array
    const emptyTos: string[] = [];
    
    // This should revert on original (require(_tos.length > 0))
    // but succeed on mutant (require(_tos.length >= 0) always true)
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        mockToken.target,
        emptyTos,
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});