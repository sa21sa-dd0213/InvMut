import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should revert when transferFrom call fails (mutant missing require(_s))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that always fails on transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleFailingToken");
    const failingToken = await TokenFactory.deploy();
    await failingToken.waitForDeployment();
    
    // Deploy the AirDropContract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Owner approves AirDropContract to spend tokens (but token will still fail)
    const tos = [addr1.address, addr2.address];
    const vs = [100, 200];
    
    // The token's transferFrom will revert, so the original contract would revert
    // The mutant would silently return true - we expect a revert
    await expect(
      instance.connect(owner).transfer(failingToken.target, tos, vs)
    ).to.be.reverted;
  });
});

// Helper contract that always reverts on transferFrom
contract SimpleFailingToken {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert("transferFrom always fails");
    }
}