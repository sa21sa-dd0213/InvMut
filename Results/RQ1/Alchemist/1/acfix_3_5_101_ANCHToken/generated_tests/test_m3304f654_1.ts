import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m3304f654 - setMinTxnAmount access control", function () {
  it("should revert when non-owner calls setMinTxnAmount (original has onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    // The constructor takes: address _route, address _USDToken
    // For testing, we can use zero addresses as placeholders since we're not testing swap functionality
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );
    await instance.waitForDeployment();

    // Attempt to call setMinTxnAmount from a non-owner address
    // The original contract has onlyOwner modifier, so this should revert
    // The mutant removes the modifier, so the call would succeed (killing the mutant)
    await expect(
      instance.connect(addr1).setMinTxnAmount(ethers.parseEther("50000"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});