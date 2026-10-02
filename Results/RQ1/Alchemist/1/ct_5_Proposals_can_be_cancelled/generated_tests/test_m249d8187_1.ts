import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m249d8187 - hasQuorum >= instead of >", function () {
  it("should kill mutant by testing quorum boundary condition (votes == 1/3 totalWeight)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER and VAULT contracts (minimal implementations for testing)
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO with mock addresses
    await dao.init(await mockVADER.getAddress(), ethers.ZeroAddress, await mockVAULT.getAddress());
    
    // Create a proposal to vote on
    await dao.newAddressProposal(addr1.address, "UTILS");
    
    // Setup mock VAULT to return specific weights for testing
    // totalWeight = 300, so 1/3 = 100 (quorum threshold)
    await mockVAULT.setTotalWeight(300);
    await mockVAULT.setMemberWeight(owner.address, 100); // exactly 1/3
    
    // Vote on proposal ID 1
    await dao.connect(owner).voteProposal(1);
    
    // Now check hasQuorum - in original (>) it should return false (100 > 100 = false)
    // In mutant (>=) it would return true (100 >= 100 = true)
    const quorumResult = await dao.hasQuorum(1);
    
    // The mutant would return true, original returns false
    // We assert the original behavior (false) to kill the mutant
    expect(quorumResult).to.equal(false);
  });
});

// Helper mock contracts for testing
contract MockVADER {
    function changeUTILS(address) external {}
    function setRewardAddress(address) external {}
}

contract MockVAULT {
    uint256 private _totalWeight;
    mapping(address => uint256) private _memberWeight;
    
    function totalWeight() external view returns (uint256) {
        return _totalWeight;
    }
    
    function getMemberWeight(address) external view returns (uint256) {
        return _memberWeight[msg.sender];
    }
    
    function setTotalWeight(uint256 weight) external {
        _totalWeight = weight;
    }
    
    function setMemberWeight(address member, uint256 weight) external {
        _memberWeight[member] = weight;
    }
}